/**
 * Hashtag group of a card (Figma 1002:13094): red `#tag` chips in one run of
 * text, cut with an ellipsis after `lines` lines on board cards; the detail
 * view shows them all. Hidden when the kudo has no hashtag.
 */
export function HashtagGroup({ hashtags, lines }: { hashtags: string[]; lines?: 1 | 2 }) {
  if (hashtags.length === 0) return null;
  const clamp = lines === 1 ? "line-clamp-1" : lines === 2 ? "line-clamp-2" : "";
  return (
    <ul data-testid="hashtag-group" className={`text-base font-bold leading-6 text-danger ${clamp}`}>
      {hashtags.map((tag) => (
        <li key={tag} className="mr-2 inline">
          {`#${tag}`}
        </li>
      ))}
    </ul>
  );
}
