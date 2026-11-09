# Project Architecture Rules

- Studio previews must use signed thumbnail URLs and DOM layout composition; reserve original images and canvas rendering for download and publication so editing stays responsive.
- publish-instagram-carousel accepts only a verified user JWT (post owner or admin) or the backend service key sent by run-scheduled-posts for due posts, and claims a post atomically before calling Instagram; never call it with the service key from the frontend, so unauthenticated or duplicate publications stay impossible.