const facts = [
  "We automate the creation and publishing of your repeatable posts",
  "We use your images, videos, brand tone and website detail - nothing random",
  "And you stay fully in control: edit, approve, or skip any post"
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container">
        
        {/* Founder's Quote Section */}
        <div className="max-w-4xl mx-auto mb-32">
          <div className="relative bg-blue-50/50 p-12 rounded-3xl border border-blue-100">
            <div className="relative z-10">
              <p className="text-xl md:text-2xl text-gray-700 italic mb-10 leading-relaxed font-medium">
                &ldquo;After years in marketing, I observed that many social posts are repeatable and predictable. I built Ferdy to automate social content that follows a pattern and save marketers a heap of time.&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <img 
                  src="/images/Andrew-cropped.jpg" 
                  alt="Andrew Ferdinando" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" 
                />
                <div>
                  <p className="font-bold text-gray-900 text-lg">Andrew Ferdinando</p>
                  <p className="text-sm text-gray-500">Founder of Ferdy</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Value Props & Quote */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Bullet Points */}
          <div className="flex flex-col justify-center">
            <div className="space-y-8">
              {facts.map((fact, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="mt-1 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xl md:text-2xl text-gray-800 font-medium leading-snug">{fact}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Quote */}
          <div className="relative">
            <div className="relative bg-blue-50/50 p-12 rounded-3xl border border-blue-100">
              <p className="text-2xl md:text-3xl lg:text-4xl text-gray-700 italic leading-relaxed font-medium">
                &ldquo;Ferdy doesn&apos;t replace your creativity - it frees you up to use it where it matters.&rdquo;
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
