# TARS — FRONTEND ACCEPTANCE CHECKLIST

**Version:** 5.0
**Status:** Frontend release gate

Use this checklist after every major screen, shared component, and integration milestone. A screen is not finished merely because it compiles or looks attractive.

---

# 1. Product correctness

- [ ] The screen implements a real TARS workflow from the PRD.
- [ ] The screen does not introduce an invented feature.
- [ ] User-visible claims are supported by actual data.
- [ ] Mock data is clearly development-only.
- [ ] Provenance is preserved wherever the backend provides it.
- [ ] Clearance/restriction state is honoured.
- [ ] Superseded/legacy state is not silently presented as current.

# 2. Information hierarchy

- [ ] There is one obvious primary task.
- [ ] The page title is visually dominant without becoming oversized.
- [ ] Supporting copy is concise.
- [ ] Secondary metadata is quieter than primary content.
- [ ] The screen does not depend on colour alone to establish hierarchy.
- [ ] The user can understand the page without opening every panel.

# 3. Visual discipline

- [ ] No dominant purple, violet, indigo or cyan.
- [ ] No AI gradient.
- [ ] No neon.
- [ ] No glow or bloom.
- [ ] No holographic or sci-fi styling.
- [ ] No decorative grid/background texture.
- [ ] No generic AI sparkle/brain/robot imagery.
- [ ] No gradient text.
- [ ] No green “LIVE/ONLINE/CONNECTED” dot.
- [ ] No pill-shaped primary control.
- [ ] No pill-everything filters.
- [ ] No card-soup.
- [ ] No unnecessary glassmorphism.
- [ ] No 3D decorative object without task value.
- [ ] The screen still feels premium with shadows and animation disabled.

# 4. Apple-aligned interaction quality

- [ ] Controls behave in familiar ways.
- [ ] Navigation is predictable.
- [ ] Direct manipulation is used where it improves the task.
- [ ] The user remains in control of consequential actions.
- [ ] Progressive disclosure is used for complexity.
- [ ] No important action is discoverable only through hover.
- [ ] Destructive or consequential actions are explicit.
- [ ] Focus management is correct for drawers, sheets and dialogs.
- [ ] Escape/back behaviour is predictable where appropriate.

# 5. Responsive quality

Test at minimum:

- [ ] 1440 × 900
- [ ] 1280 × 800
- [ ] 1024 × 768
- [ ] 834 × 1194
- [ ] 768 × 1024
- [ ] 430 × 932
- [ ] 393 × 852
- [ ] 375 × 812

For each breakpoint:

- [ ] no accidental horizontal scrolling;
- [ ] no clipped text that contains required information;
- [ ] no cramped two-column layout;
- [ ] secondary information moves to disclosure when appropriate;
- [ ] navigation remains reachable;
- [ ] fixed elements respect safe areas;
- [ ] touch targets are approximately 44px or larger;
- [ ] mobile is re-composed, not merely shrunk.

# 6. Typography

- [ ] One coherent system font stack is used.
- [ ] Heading hierarchy is visible without excessive weight.
- [ ] Body text remains comfortable at normal zoom.
- [ ] Metadata is quiet but readable.
- [ ] Technical identifiers use a restrained monospace treatment only when useful.
- [ ] Numbers align correctly where comparison matters.
- [ ] No giant condensed/techno typography appears in operational UI.

# 7. Colour and semantics

- [ ] Neutral colour carries most of the interface.
- [ ] Accent colour is sparse.
- [ ] Semantic colour has a semantic reason.
- [ ] Red means a real critical/blocking/error state.
- [ ] Amber means attention/review, not decoration.
- [ ] Green is reserved for genuinely positive/completed semantic states.
- [ ] Connectivity does not use a generic green dot.
- [ ] Meaning remains understandable when colour vision is reduced.

# 8. Surfaces and materials

- [ ] Maximum of a few meaningful surface levels.
- [ ] Borders establish structure without visual heaviness.
- [ ] Shadows are subtle and directional.
- [ ] Blur is optional, restrained and never used to create the hierarchy.
- [ ] No nested surface exists solely because a component convention expects a card.
- [ ] Radius choices are consistent by component category.

# 9. Motion

- [ ] Motion communicates causality or continuity.
- [ ] Entrance motion is brief.
- [ ] No springy/bouncy “AI” motion.
- [ ] No perpetual animation unless the user is waiting for active processing.
- [ ] Reduced-motion preference is honoured.
- [ ] Animation never hides a state change.

# 10. Accessibility

- [ ] Keyboard navigation reaches all important actions.
- [ ] Focus is visible.
- [ ] Buttons and controls have accessible names.
- [ ] Form labels are programmatically associated.
- [ ] Status is not communicated with colour alone.
- [ ] Touch controls have comfortable hit areas.
- [ ] Text has adequate contrast.
- [ ] Dialogs/sheets have correct focus handling.
- [ ] Reduced motion is respected.

# 11. Async state honesty

Every backend-dependent interaction has:

- [ ] idle;
- [ ] in progress;
- [ ] success/ready;
- [ ] empty/unavailable where applicable;
- [ ] error/retry;
- [ ] restricted where applicable.

Do not show a successful-looking surface while the real operation is still pending.

# 12. Mobile-specific interaction audit

- [ ] bottom navigation does not cover content;
- [ ] fixed bars use safe-area insets;
- [ ] sheets can be dismissed reliably;
- [ ] scrolling remains native-feeling;
- [ ] no critical action requires precision pointer dragging;
- [ ] audio controls remain usable with one hand;
- [ ] inputs remain visible above the keyboard;
- [ ] large desktop tables become readable mobile structures.

# 13. Technical frontend hygiene

- [ ] shared styles use semantic design tokens;
- [ ] repeated JSX is extracted into reusable primitives;
- [ ] page-specific CSS does not silently redefine global tokens;
- [ ] icons are from the established icon system;
- [ ] no page creates its own unrelated visual language;
- [ ] no hard-coded API response is presented as real data;
- [ ] no sensitive data is stored in browser storage unless explicitly required;
- [ ] loading and error handling do not depend on console logs.

# 14. Final visual self-test

Ask:

```text
Does this look expensive because it is precise,
or because it is decorated?

Can I understand the page in three seconds?

Is the primary task stronger than the chrome?

Could I remove a card without losing meaning?

Could I remove a badge without losing meaning?

Could I remove an animation without losing meaning?

Would this still look good printed in grayscale?

Would this feel natural on a MacBook and an iPhone?

Does anything look like generic “AI software”?

Does anything look like a spaceship/control room?

Does anything visually shout when it should quietly inform?
```

If a screen fails these questions, revise the composition before adding more detail.

---

# 15. Integration acceptance for the demo-critical loop

The frontend is ready for the live demo only when the following chain is coherent:

```text
call recording
  ↓
call/transcript evidence
  ↓
commitment
  ↓
action
  ↓
company decision
  ↓
what-if impact
  ↓
architecture finding
  ↓
file/line evidence
  ↓
local explanation
  ↓
ADR reference
```

The user should be able to move between those related records without losing context or feeling that they are visiting unrelated applications.
