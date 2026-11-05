// Response compression for the production server.
//
// Browsers offer brotli, but compression builds its brotli stream from the
// `brotli` options alone, so `flush` never reaches it: the whole page would
// arrive when the response ends instead of chunk by chunk. gzip honours
// Z_SYNC_FLUSH, which pushes every written chunk out as it happens, so
// streaming SSR keeps its early first byte and its per-chunk delivery.
import { constants } from "node:zlib";
import compression from "compression";

const gzip = compression({ flush: constants.Z_SYNC_FLUSH });

// compression negotiates brotli whenever the client offers it, so narrow the
// offer to gzip before it reads the header. A client that does not accept gzip
// is told `identity`, which makes compression pass the response through
// untouched.
function preferGzip(req) {
  const acceptEncoding = req.headers["accept-encoding"];
  if (acceptEncoding === undefined) return;
  req.headers["accept-encoding"] = /\bgzip\b/i.test(acceptEncoding)
    ? "gzip"
    : "identity";
}

export function withCompression(req, res, next) {
  preferGzip(req);
  gzip(req, res, next);
}
