# Project Architecture Rules

- Studio previews must use signed thumbnail URLs and DOM layout composition; reserve original images and canvas rendering for download and publication so editing stays responsive.
- publish-instagram-carousel accepts only a verified user JWT (post owner or admin) or the backend service key sent by run-scheduled-posts for due posts, and claims a post atomically before calling Instagram; never call it with the service key from the frontend, so unauthenticated or duplicate publications stay impossible.
- run-scheduled-posts is triggered only by the managed HTTP schedule and must authenticate with the shared cron-auth helper (private cron secret); never re-add a cron job that calls it with the public key, so outsiders cannot trigger automatic processing.- OAuth callback Edge Functions (Google Calendar, Instagram) must answer with a 303 redirect to a CRM route on the signed-state origin, never HTML, because the gateway serves function HTML as plain text.
