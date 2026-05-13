
const codes = ["MS 4-P35", "MS 4-P35-A", "ms 4-p35", "MS4-P35", "MS 4 -P35", "MS 4- P35", "MS 4 P35", "MS 4-35P"];
const validEspiralLengths = [2.5, 3.5, 5.0, 8.0, 10.0, 15.0, 20.0];
const isValidEspiral = (l) => validEspiralLengths.includes(l);

codes.forEach(c => {
  console.log(`Testing: "${c}"`);
  // New regex
  let match = c.match(/^MS\s*\d+[\s-]*P\s*(\d+)/i);
  if (match) {
    const len = Number(match[1]) / 10;
    console.log(`  Match found! Len: ${len}, IsValid: ${isValidEspiral(len)}`);
  } else {
    console.log("  No match.");
  }
});
