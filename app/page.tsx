"use client";

import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2c2017_0%,#140f0d_45%,#090807_100%)] text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="mt-10 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-stone-400">
            Sneak. Survive. Escape
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase tracking-[0.08em] text-stone-50 sm:text-7xl">
            BOINK!
          </h1>
          <p className="mt-6 max-w-xl text-md leading-8 text-stone-300">
            Navigate, stay out of the guards&apos; sight, and make it out
            without getting &quot;boinked&quot;
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/game"
            className="rounded-full bg-green-500 px-7 py-4 text-sm font-bold uppercase tracking-[0.2em] text-black transition hover:bg-green-400"
          >
            Play
          </Link>
          <button
            type="button"
            onClick={() => setIsHowToPlayOpen(true)}
            className="cursor-pointer rounded-full border border-stone-700/80 bg-stone-950/40 px-7 py-4 text-sm uppercase tracking-[0.18em] text-stone-300 hover:bg-stone-900"
          >
            How to play
          </button>
        </div>
      </div>

      {isHowToPlayOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setIsHowToPlayOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            className="w-full max-w-lg rounded-2xl border border-stone-700 bg-stone-950 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                  Game Guide
                </p>
                <h2
                  id="how-to-play-title"
                  className="mt-2 text-[30px] font-bold uppercase tracking-[0.08em]"
                >
                  How to play
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(false)}
                className="flex px-2 py-1.25 text-xs text-stone-300 cursor-pointer hover:text-stone-200"
              >
                X
              </button>
            </div>

            <div className="ml-4 mt-4 space-y-3 text-sm leading-7 text-stone-300">
              <p>1. Navigate through the map and reach the exit</p>
              <p>
                2. Avoid the guards and stay out of their &quot;cone&quot; of
                sight
              </p>
              <p>3. If a guard catches you... Boink!</p>
              <p>P.S: There&apos;s an infinite amount of levels, good luck!</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
