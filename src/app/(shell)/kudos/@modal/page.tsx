// The board beside this slot blocks on per-viewer Go reads (validated with the route).
export const instant = false;

/**
 * `/kudos` itself in the modal slot: a soft navigation back to the board
 * (header link, "Đóng" on a direct-link page) closes any open overlay.
 */
export default function KudoModalClosed() {
  return null;
}
