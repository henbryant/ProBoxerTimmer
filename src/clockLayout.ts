export function clockLayout(
  bounds: { width: number; height: number },
  stretchVertically: boolean,
  singleDigitMinutes = false,
) {
  // DSEG7 Classic Bold uses .816 em per digit and .2 em for the colon.
  const digitCount = singleDigitMinutes ? 3 : 4;
  const clockWidthInEm = digitCount * 0.816 + 0.2;
  const availableHeight = bounds.height * 0.96;
  const fontSize = Math.floor(Math.min(bounds.width / clockWidthInEm, availableHeight));
  const scaleY = stretchVertically && fontSize > 0
    ? Math.min(1.4, availableHeight / fontSize)
    : 1;

  return { fontSize, scaleY };
}
