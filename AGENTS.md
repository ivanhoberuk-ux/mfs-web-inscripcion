# Architecture rules

- Keep the visual system centralized in `src/lib/designSystem.ts` and shared primitives; this preserves Expo web/Android consistency.
- Keep desktop navigation inside the tabs layout and the root layout header-free; this prevents duplicate navigation across routes.
- Render Paraguayan identity through the shared `FondoParaguayo` SVG layer and flag tokens; this keeps decoration consistent across web and Android.
- Build page headings, section headings, and person avatars from shared visual primitives; this keeps user-facing screens consistent across web and Android.
