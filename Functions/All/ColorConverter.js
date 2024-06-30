/**
 * Convertit une couleur HTML en un nombre hexadécimal.
 * @param {string} htmlColor - La couleur HTML à convertir (par exemple, '#FF5733' ou '#3a7233ff').
 * @returns {number} - La couleur convertie en nombre hexadécimal.
 */
function htmlToHex(htmlColor) {
  if (htmlColor.startsWith("#")) {
    // Tronque la couleur à 6 caractères après le '#'
    const truncatedColor = htmlColor.slice(1, 7);
    const hex = parseInt(truncatedColor, 16);
    if (isNaN(hex) || hex < 0 || hex > 0xffffff) {
      throw new RangeError(
        "La couleur doit être dans la plage 0 - 16777215 (0xFFFFFF)."
      );
    }
    return hex;
  }
  throw new Error("La couleur doit commencer par #.");
}

module.exports = { htmlToHex };
