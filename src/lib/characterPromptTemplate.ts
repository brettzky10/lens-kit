/**
 * Builds a long-form, consistency-focused character description from the
 * short input the person typed (plus whatever Camera/Lens fragments got
 * folded in upstream). This is NOT an LLM call — there's no text-generation
 * API wired into this app, so it's a deterministic template that repeats
 * and reinforces the supplied details in different phrasing, aimed at
 * landing in the ~200-word range so downstream Image/Video prompts get a
 * consistently-detailed character description every time.
 *
 * If you have an LLM API available (Anthropic, OpenAI, etc.), swap the body
 * of this function for a real completion call — the signature can stay the
 * same either way.
 */
export function buildCharacterPrompt(rawDescription: string): string {
  const description = rawDescription.trim();

  if (!description) {
    return "";
  }

  return [
    `Character reference sheet subject: ${description}.`,
    `This character must be rendered with completely consistent facial structure, proportions, hairstyle, and skin tone in every image — no variation between shots.`,
    `Costume and accessories must match exactly across every generation: same garments, same colors, same materials, same wear patterns, same accessories, same silhouette.`,
    `Maintain identical age, build, and posture cues across facial close-up, full frontal, and full back views.`,
    `Lighting should be neutral and even (soft studio lighting) so color and material accuracy stay consistent across every generated view, avoiding any stylistic drift.`,
    `Background should stay plain and unobtrusive (seamless neutral backdrop) so the character design itself remains the sole focus and easy to reference.`,
    `Render at high fidelity with clean, sharp linework and accurate anatomy, suitable for use as a production character turnaround / reference sheet.`,
    `${description} — repeat and lock these defining traits, costume details, and color palette on every subsequent generation of this character.`,
  ].join(" ");
}
