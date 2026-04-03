export function openWiki(element) {
  const wikiUrl = `https://pathfinder.fandom.com/wiki/${encodeURIComponent(element)}`;
  window.open(wikiUrl, '_blank');
}

export function calculerPV(forValue, conValue, niveau) {
  return Math.floor((forValue + conValue) / 2) + niveau * 2;
}