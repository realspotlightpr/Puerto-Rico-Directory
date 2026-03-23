import { Link } from "wouter";
import { Facebook, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group inline-flex hover:opacity-80 transition-opacity">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Spotlight Puerto Rico"
                className="h-10 w-auto object-contain"
                style={{ mixBlendMode: "multiply" }}
              />
              <span className="font-display font-bold text-lg">Spotlight PR</span>
            </Link>
            <p className="text-muted-foreground max-w-sm mb-6">
              The premier directory for discovering the best local businesses, services, and experiences across Puerto Rico. Support local!
            </p>
            <div className="flex items-center gap-4">
              <a href="https://www.facebook.com/SpotlightpromoPR" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-blue-600 hover:text-white transition-colors" title="Follow on Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/spotlightpromopr/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-pink-500 hover:text-white transition-colors" title="Follow on Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-display font-bold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/directory" className="text-muted-foreground hover:text-primary transition-colors">Browse Directory</Link></li>
              <li><Link href="/list-your-business" className="text-muted-foreground hover:text-primary transition-colors">Add Your Business</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-bold mb-4">Support</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Spotlight Puerto Rico. All rights reserved.</p>
          <p className="flex items-center gap-1">Made with <span className="text-secondary">♥</span> in PR</p>
        </div>
      </div>
    </footer>
  );
}
