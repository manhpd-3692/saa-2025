// The board beside this slot blocks on per-viewer Go reads (validated with the route).
export const instant = false;

/** No kudo open over the board (initial load, refresh, direct link): the slot renders nothing. */
export default function KudoModalDefault() {
  return null;
}
