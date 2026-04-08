export function openWiki(element) {
  const wikiUrl = `https://pathfinder.fandom.com/wiki/${encodeURIComponent(element)}`;
  window.open(wikiUrl, '_blank');
}

// Calcul des PV selon les règles Pathfinder :
// dé de vie de la classe (passé en paramètre) + modificateur de Constitution * niveau
export function calculerPV(deVie, conValue, niveau) {
  const modCon = Math.floor((conValue - 10) / 2);
  return deVie + modCon * niveau;
}
