/** A small info panel shown at the top of each pipeline stage. */
interface Item {
  key: string;
  val: string;
}

interface InfoBoxProps {
  icon: string;
  title: string;
  text: string;
  items?: Item[];
}

export default function InfoBox({ icon, title, text, items }: InfoBoxProps) {
  return (
    <div className="info-box">
      <div className="info-box-icon">{icon}</div>
      <div className="info-box-body">
        <div className="info-box-title">{title}</div>
        <div>{text}</div>
        {items && items.length > 0 && (
          <ul className="info-box-items">
            {items.map((it) => (
              <li key={it.key}>
                <span className="ibi-key">{it.key}</span>
                <span className="ibi-val">{it.val}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
