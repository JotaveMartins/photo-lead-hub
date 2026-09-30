import EntregasFunil from "./EntregasPageOld";

// Funil de Entregas liberado para todos os usuários autenticados.
// Isolamento garantido por RLS (user_id) + useEffectiveUserId (impersonação do admin).
const EntregasPage = () => <EntregasFunil />;

export default EntregasPage;
