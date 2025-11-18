import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

export default function Landing() {
  const { signInWithGoogle } = useFirebaseAuth();

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <main className="relative isolate px-6 pt-16 sm:pt-20 lg:px-8">
        {/* Top gradient blob */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#7FC8F8] to-[#C57B57] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-4xl py-16 sm:py-24 lg:py-28">
          {/* HERO */}
          <section className="text-center mb-16">
            <div className="mb-6">
              <span
                role="img"
                aria-label="hiking backpack"
                className="text-5xl sm:text-6xl"
              >
                🎒
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance">
              GearShare
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-300 max-w-3xl mx-auto">
              Share outdoor gear with trusted friends and discover amazing
              equipment for your next adventure. From camping and hiking to
              climbing and water sports — get access to the gear you need.
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-500 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-all duration-200"
              >
                🏔️ Start Sharing Gear · Sign in with Google
              </button>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                New to GearShare? Your account will be created automatically
                when you sign in with Google.
              </p>
            </div>
          </section>

          {/* FEATURES */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
            <div className="text-center p-6 rounded-2xl bg-white/5 shadow-sm ring-1 ring-white/10">
              <p className="text-2xl mb-2">🏕️</p>
              <h3 className="text-lg font-semibold mb-2">Share Camping Gear</h3>
              <p className="text-sm text-gray-300">
                Lend your tents, sleeping bags, and camping equipment to trusted
                friends.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/5 shadow-sm ring-1 ring-white/10">
              <p className="text-2xl mb-2">🧗</p>
              <h3 className="text-lg font-semibold mb-2">
                Hiking &amp; Climbing
              </h3>
              <p className="text-sm text-gray-300">
                Access hiking boots, climbing gear, and outdoor equipment when
                you need it.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/5 shadow-sm ring-1 ring-white/10 sm:col-span-2 lg:col-span-1">
              <p className="text-2xl mb-2">⛰️</p>
              <h3 className="text-lg font-semibold mb-2">Adventure Ready</h3>
              <p className="text-sm text-gray-300">
                Build trust within your group and share gear for any outdoor
                adventure.
              </p>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8">
              How It Works
            </h2>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-sm text-gray-200">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <span className="text-lg sm:text-xl font-bold">1</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-1">
                  Join &amp; Connect
                </h3>
                <p className="max-w-xs text-gray-300">
                  Sign up and create groups with friends you trust to share
                  gear.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <span className="text-lg sm:text-xl font-bold">2</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-1">
                  Share Your Gear
                </h3>
                <p className="max-w-xs text-gray-300">
                  List your outdoor equipment and make it available to your
                  trusted group.
                </p>
              </div>

              <div className="flex flex-col items-center sm:col-span-2 lg:col-span-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <span className="text-lg sm:text-xl font-bold">3</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-1">
                  Borrow &amp; Adventure
                </h3>
                <p className="max-w-xs text-gray-300">
                  Request gear from friends and embark on your next outdoor
                  adventure.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom gradient blob */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-[#7FC8F8] to-[#C57B57] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
            }}
          />
        </div>
      </main>
    </div>
  );
}
