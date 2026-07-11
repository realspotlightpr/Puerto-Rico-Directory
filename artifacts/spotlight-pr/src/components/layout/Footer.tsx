import { Link } from "wouter";
import { Facebook, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10">

          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group inline-flex hover:opacity-80 transition-opacity">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Spotlight Puerto Rico" className="h-10 w-auto object-contain" style={{ mixBlendMode: "multiply" }} />
              <span className="font-display font-bold text-lg">Spotlight PR</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6 leading-relaxed">
              Discover the best of Puerto Rico — beaches, local businesses, experiences, and hidden gems across all 78 towns. Support local!
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/SpotlightpromoPR" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-blue-600 hover:text-white transition-colors" title="Follow on Facebook"><Facebook className="w-4 h-4" /></a>
              <a href="https://www.instagram.com/spotlightpromopr/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-pink-500 hover:text-white transition-colors" title="Follow on Instagram"><Instagram className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm mb-4 text-foreground">Explore</h4>
            <ul className="space-y-3">
              <li><Link href="/directory" className="text-sm text-muted-foreground hover:text-primary transition-colors">Browse Directory</Link></li>
              <li><Link href="/activities" className="text-sm text-muted-foreground hover:text-primary transition-colors">Places to Explore</Link></li>
              <li><Link href="/experiences" className="text-sm text-muted-foreground hover:text-primary transition-colors">Book an Experience</Link></li>
              <li><Link href="/surf" className="text-sm text-muted-foreground hover:text-primary transition-colors">Surf Report</Link></li>
              <li><Link href="/date-builder" className="text-sm text-muted-foreground hover:text-primary transition-colors">Date &amp; Trip Builder</Link></li>
              <li><Link href="/discover" className="text-sm text-muted-foreground hover:text-primary transition-colors">Discover (Swipe)</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm mb-4 text-foreground">Membership</h4>
            <ul className="space-y-3">
              <li><Link href="/pass" className="text-sm text-muted-foreground hover:text-primary transition-colors">Spotlight Pass</Link></li>
              <li><Link href="/for-guides" className="text-sm text-muted-foreground hover:text-primary transition-colors">Become a Guide</Link></li>
              <li><Link href="/saved" className="text-sm text-muted-foreground hover:text-primary transition-colors">Saved</Link></li>
              <li><Link href="/plans" className="text-sm text-muted-foreground hover:text-primary transition-colors">My Plans</Link></li>
              <li><Link href="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">My Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm mb-4 text-foreground">For Businesses</h4>
            <ul className="space-y-3">
              <li><Link href="/business" className="text-sm text-muted-foreground hover:text-primary transition-colors">For Businesses</Link></li>
              <li><Link href="/spotlight-plus" className="text-sm text-muted-foreground hover:text-primary transition-colors">Spotlight Plus</Link></li>
              <li><Link href="/list-your-business" className="text-sm text-muted-foreground hover:text-primary transition-colors">Add Your Business</Link></li>
              <li><Link href="/list-your-business" className="text-sm text-muted-foreground hover:text-primary transition-colors">Claim Your Listing</Link></li>
              <li><Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Business Dashboard</Link></li>
              <li><a href="mailto:realspotlightpr@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Spotlight Puerto Rico. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
            <span className="flex items-center gap-1">Made with <span className="text-secondary">♥</span> in PR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
