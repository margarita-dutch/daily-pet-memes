// Tiny structured logger. Keeps Render logs readable without pulling in a dep.
function ts() {
  return new Date().toISOString();
}

function fmt(level, msg, extra) {
  const base = `[${ts()}] ${level} ${msg}`;
  if (!extra) return base;
  try {
    return `${base} ${JSON.stringify(extra)}`;
  } catch {
    return base;
  }
}

module.exports = {
  info: (msg, extra) => console.log(fmt('INFO', msg, extra)),
  warn: (msg, extra) => console.warn(fmt('WARN', msg, extra)),
  error: (msg, extra) => console.error(fmt('ERROR', msg, extra)),
};
