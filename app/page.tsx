import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { PublicToolList } from "@/components/PublicToolList";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-brand">LendLoop</h1>
          <p className="hero-tag">Borrow what you need. Lend what you don&apos;t.</p>
          <div className="hero-cta">
            <Show when="signed-out">
              <Link href="/sign-in" className="btn btn-primary">
                Sign in to lend or borrow
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/browse" className="btn btn-primary">
                Open the board
              </Link>
            </Show>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2>Available now</h2>
          <p className="lede">
            A read-only peek at tools neighbors are willing to lend — name and
            category only until you sign in.
          </p>
          <PublicToolList />
        </div>
      </section>
    </>
  );
}
