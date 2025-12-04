export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="h2">{title}</h2>
      {children}
    </section>
  );
}
