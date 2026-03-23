import { Link } from "wouter";
import { Facebook, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10">

          {/* Brand column — spans 2 on large screens */}
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group inline-flex hover:opacity-80 transition-opacity">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Spotlight Puerto Rico"
                className="h-10 w-auto object-contain"
                style={{ mixBlendMode: "multiply" }}
              />
              <span className="font-display font-bold text-lg">Spotlight PR</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6 leading-relaxed">
              The premier directory for discovering the best local businesses, services, and experiences across Puerto Rico. Support local!
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/SpotlightpromoPR"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-blue-600 hover:text-white transition-colors"
                title="Follow on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/spotlightpromopr/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-pink-500 hover:text-white transition-colors"
                title="Follow on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* For the People */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4 text-foreground">For the People</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/directory" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Browse Directory
                </Link>
              </li>
              <li>
                <Link href="/directory" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Find a Restaurant
                </Link>
              </li>
              <li>
                <Link href="/directory" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Explore by Town
                </Link>
              </li>
              <li>
                <Link href="/directory" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Leave a Review
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4 text-foreground">For Businesses</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/list-your-business" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Add Your Business
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Business Dashboard
                </Link>
              </li>
              <li>
                <Link href="/list-your-business" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Claim Your Listing
                </Link>
              </li>
              <li>
                <Link href="/postcard-marketing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  📬 Postcard Marketing
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Advertise with Us
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Business FAQs
                </a>
              </li>
            </ul>
          </div>

          {/* Work with Us */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4 text-foreground">Work with Us</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/team" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Join Our Team
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Become an Affiliate
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Partner Programs
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy & Terms
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Spotlight Puerto Rico. All rights reserved.</p>
          <p className="flex items-center gap-1">Made with <span className="text-secondary">♥</span> in PR</p>
        </div>
      </div>
    </footer>
  );
}
