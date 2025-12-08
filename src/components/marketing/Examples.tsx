const examples = [
  {
    name: "Chanel",
    company: "The Marketing Club",
    image: "/images/chanel.jpg",
    automates: ["Product highlights", "Event reminders", "Sponsor spotlights"],
    testimonial: "Ferdy saves me hours every week on routine updates.",
    borderColor: "border-t-pink-500"
  },
  {
    name: "Rachel",
    company: "Highlands Motorsport Park",
    image: "/images/rachel.jpg",
    automates: ["What we offer", "Motorsport event promos", "FAQs"],
    testimonial: "Our event promos are now always on time, automatically.",
    borderColor: "border-t-teal-500"
  },
  {
    name: "Jen",
    company: "Game Over",
    image: "/images/portrait_jen.png",
    automates: ["Everyday products", "Weekly deals", "Seasonal events", "Testimonials"],
    testimonial: "I can finally focus on running the business instead of posting.",
    borderColor: "border-t-orange-500"
  }
];

export default function Examples() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Practical Examples</h2>
          <p className="text-xl text-gray-600">See how different businesses use Ferdy to stay consistent.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {examples.map((ex, i) => (
            <div key={i} className={`bg-white rounded-2xl overflow-hidden shadow-lg border-t-4 ${ex.borderColor} hover:shadow-xl transition-shadow`}>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={ex.image} 
                    alt={ex.name} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" 
                  />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{ex.name}</h3>
                    <p className="text-sm text-gray-600">{ex.company}</p>
                  </div>
                </div>

                <blockquote className="mb-6 text-lg italic text-gray-700">
                  &ldquo;{ex.testimonial}&rdquo;
                </blockquote>
                
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Automates:</p>
                  <div className="flex flex-wrap gap-2">
                    {ex.automates.map((item, j) => (
                      <span 
                        key={j} 
                        className="inline-block px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
