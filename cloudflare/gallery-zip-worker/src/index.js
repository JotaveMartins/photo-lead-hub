// Cloudflare Worker: gera o ZIP de uma galeria em streaming, lendo os originais
// direto do R2 via binding (bucket privado). Modo STORE (sem recompressão), ZIP64.
// Nada é acumulado em memória além de cabeçalhos e da lista de arquivos.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crcUpdate = (crc, buf) => {
  let c = crc ^ 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const enc = new TextEncoder();

const dosDateTime = (d) => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

const bytes = (size, fill) => {
  const b = new Uint8Array(size);
  fill(new DataView(b.buffer));
  return b;
};

const localHeader = (name, dt) =>
  bytes(30 + name.length + 20, (v) => {
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 45, true); // versão: ZIP64
    v.setUint16(6, 0x0808, true); // bit 3 (data descriptor) + bit 11 (UTF-8)
    v.setUint16(8, 0, true); // STORE
    v.setUint16(10, dt.time, true);
    v.setUint16(12, dt.date, true);
    v.setUint32(14, 0, true);
    v.setUint32(18, 0xffffffff, true);
    v.setUint32(22, 0xffffffff, true);
    v.setUint16(26, name.length, true);
    v.setUint16(28, 20, true);
    new Uint8Array(v.buffer).set(name, 30);
    const e = 30 + name.length;
    v.setUint16(e, 0x0001, true);
    v.setUint16(e + 2, 16, true); // tamanhos zerados (vão no descriptor)
  });

const dataDescriptor = (crc, size) =>
  bytes(24, (v) => {
    v.setUint32(0, 0x08074b50, true);
    v.setUint32(4, crc, true);
    v.setBigUint64(8, BigInt(size), true);
    v.setBigUint64(16, BigInt(size), true);
  });

const centralHeader = (f, dt) =>
  bytes(46 + f.name.length + 28, (v) => {
    v.setUint32(0, 0x02014b50, true);
    v.setUint16(4, 45, true);
    v.setUint16(6, 45, true);
    v.setUint16(8, 0x0808, true);
    v.setUint16(10, 0, true);
    v.setUint16(12, dt.time, true);
    v.setUint16(14, dt.date, true);
    v.setUint32(16, f.crc, true);
    v.setUint32(20, 0xffffffff, true);
    v.setUint32(24, 0xffffffff, true);
    v.setUint16(28, f.name.length, true);
    v.setUint16(30, 28, true);
    v.setUint32(42, 0xffffffff, true);
    new Uint8Array(v.buffer).set(f.name, 46);
    const e = 46 + f.name.length;
    v.setUint16(e, 0x0001, true);
    v.setUint16(e + 2, 24, true);
    v.setBigUint64(e + 4, BigInt(f.size), true);
    v.setBigUint64(e + 12, BigInt(f.size), true);
    v.setBigUint64(e + 20, BigInt(f.offset), true);
  });

const endRecords = (count, cdOffset, cdSize) => {
  const zip64End = bytes(56, (v) => {
    v.setUint32(0, 0x06064b50, true);
    v.setBigUint64(4, 44n, true);
    v.setUint16(12, 45, true);
    v.setUint16(14, 45, true);
    v.setBigUint64(24, BigInt(count), true);
    v.setBigUint64(32, BigInt(count), true);
    v.setBigUint64(40, BigInt(cdSize), true);
    v.setBigUint64(48, BigInt(cdOffset), true);
  });
  const locator = bytes(20, (v) => {
    v.setUint32(0, 0x07064b50, true);
    v.setBigUint64(8, BigInt(cdOffset + cdSize), true);
    v.setUint32(16, 1, true);
  });
  const eocd = bytes(22, (v) => {
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, 0xffff, true);
    v.setUint16(10, 0xffff, true);
    v.setUint32(12, 0xffffffff, true);
    v.setUint32(16, 0xffffffff, true);
  });
  return [zip64End, locator, eocd];
};

const page = (msg, status) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;display:flex;min-height:90vh;align-items:center;justify-content:center;color:#57534e"><p>${msg}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

export default {
  async fetch(req, env, ctx) {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const token = new URL(req.url).searchParams.get("t") ?? "";
    if (!token || token.length > 300) return page("Link de download inválido.", 400);

    // A validação (assinatura, validade, galeria publicada, não expirada,
    // download liberado) acontece no backend do CRM, que devolve a lista de arquivos.
    const res = await fetch(`${env.SUPABASE_URL}/functions/v1/gallery-public`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: "zip-manifest", zipToken: token }),
    });
    if (!res.ok) return page("Esta galeria não está mais disponível.", 403);
    const { zipName, files } = await res.json();
    if (!Array.isArray(files) || !files.length) return page("Nenhuma foto disponível para download.", 404);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const pump = async () => {
      let offset = 0;
      const written = [];
      const write = async (chunk) => {
        await writer.write(chunk); // respeita backpressure
        offset += chunk.length;
      };
      try {
        for (const f of files) {
          if (typeof f.key !== "string" || !f.key.startsWith("galleries/") || f.key.includes("..")) continue;
          const obj = await env.GALLERY_BUCKET.get(f.key);
          if (!obj) continue;
          const name = enc.encode(f.name);
          const dt = dosDateTime(obj.uploaded ?? new Date());
          const start = offset;
          await write(localHeader(name, dt));
          let crc = 0;
          let size = 0;
          const reader = obj.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            crc = crcUpdate(crc, value);
            size += value.length;
            await write(value);
          }
          await write(dataDescriptor(crc, size));
          written.push({ name, crc, size, offset: start, dt });
        }
        const cdOffset = offset;
        for (const f of written) await write(centralHeader(f, f.dt));
        for (const r of endRecords(written.length, cdOffset, offset - cdOffset)) await write(r);
        await writer.close();
      } catch (e) {
        await writer.abort(e);
      }
    };
    ctx.waitUntil(pump());

    const safe = String(zipName || "galeria.zip").replace(/[^a-z0-9.-]/gi, "-");
    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safe}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  },
};
