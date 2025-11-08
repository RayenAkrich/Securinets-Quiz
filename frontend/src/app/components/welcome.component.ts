import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="hero-inner">
        <h1 class="title">SecuriQuiz</h1>
        <p class="subtitle">Learn then Test Your Knowledge</p>
        <p class="tagline">The ultimate quiz experience</p>

        <p class="description">Securinets-Quiz is an online platform developed for the SecurinetsFST organization. It is designed to host tests in the form of quizzes, allowing users to participate in exams and receive instant feedback on their results.</p>

        <div class="actions">
          <a class="btn primary" routerLink="/signup">Get Started</a>
          <a class="btn" routerLink="/quizzes">Explore Quizzes</a>
        </div>
      </div>
    </section>

    <section class="features">
      <h2>Explore Quiz Categories</h2>
      <p class="lead">Discover quizzes across various subjects to test and expand your knowledge</p>
      <div class="cards">
        <article class="card">
          <h3>Introduction to CyberSecurity</h3>
          <p>Start here if you're new to security concepts and best practices.</p>
        </article>
        <article class="card">
          <h3>Web Development</h3>
          <p>Test your skills on frontend and backend fundamentals.</p>
        </article>
        <article class="card">
          <h3>Networking</h3>
          <p>Understand networks, protocols, and infrastructure.</p>
        </article>
      </div>
    </section>

    <footer class="site-footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="brand-head">
            <img class="logo" src="/securinets.ico" alt="logo" />
            <div>
              <h3>SecuriQuiz</h3>
              <p class="muted">The ultimate quiz platform for students and teachers.</p>
            </div>
          </div>

          <div class="social-icons" aria-hidden="false">
            <a class="icon" href="https://www.facebook.com/profile.php?id=61566401400743" title="facebook" aria-label="Facebook" target="_blank" rel="noopener">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/facebook.svg" alt="Facebook logo"/>
            </a>
            <a class="icon" href="https://www.tiktok.com/@securinets_fst?lang=en" title="tiktok" aria-label="TikTok" target="_blank" rel="noopener">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/tiktok.svg" alt="TikTok logo"/>
            </a>
            <a class="icon" href="https://www.instagram.com/securinets_fst/" title="instagram" aria-label="Instagram" target="_blank" rel="noopener">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/instagram.svg" alt="Instagram logo"/>
            </a>
            <a class="icon" href="https://www.linkedin.com/company/securinets-fst/posts/?feedView=all" title="linkedin" aria-label="LinkedIn" target="_blank" rel="noopener">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/linkedin.svg" alt="LinkedIn logo"/>
            </a>
          </div>
        </div>

        <div class="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a routerLink="/">Home</a></li>
            <li><a routerLink="/about">About Us</a></li>
            <li><a routerLink="/contact">Contact</a></li>
          </ul>
        </div>

        <div class="footer-contact">
          <h4>Contacts us</h4>
          <ul>
            <li class="contact-item"><svg viewBox="0 0 24 24" fill="none"><path d="M3 8.5a4 4 0 014-4h10a4 4 0 014 4v7.5a4 4 0 01-4 4H7a4 4 0 01-4-4V8.5z" stroke="#cfcfd1" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>securinetsfst@gmail.com</span></li>
            <li class="contact-item"><svg viewBox="0 0 24 24" fill="none"><path d="M22 16.92V20a2 2 0 01-2 2 19 19 0 01-8.63-2.5A19 19 0 013.5 6.63 19 19 0 011 3a2 2 0 012-2h3.09a2 2 0 012 1.72c.12 1.01.38 2.02.78 2.96a2 2 0 01-.45 2.11L7.5 9.5" stroke="#cfcfd1" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>22 734 728</span></li>
            <li class="contact-item"><svg viewBox="0 0 24 24" fill="none"><path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0118 0z" stroke="#cfcfd1" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="2" stroke="#cfcfd1" stroke-width="1.2"/></svg><span>Faculté des sciences de Tunis</span></li>
          </ul>
        </div>
      </div>

      <div class="bottom-bar">
        <div>Copyright © 2025 SecuriQuiz</div>
        <div class="bottom-links">All Rights Reserved | <a href="https://www.termsfeed.com/live/1b0b2d85-2553-4940-83d2-a571d3da34a8">Terms and Conditions</a> | <a href="https://www.termsfeed.com/live/1e007940-99a4-4b12-b3fd-db3a15b11050">Privacy Policy</a></div>
      </div>
    </footer>
  `,
  styles: [
    `
  /* Host entrance */
  :host { display: block; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #e6e6e9; animation: fadeIn 600ms ease both; }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  .hero { background: linear-gradient(180deg, rgba(73,5,154,0.08), rgba(0,0,0,0.0)); padding: 4rem 1rem; text-align: center; }
  .hero-inner { max-width: 900px; margin: 0 auto; animation: slideUp 700ms cubic-bezier(.2,.9,.2,1) both; }
  .title { font-size: 3rem; color: #ffffff; margin: 0 0 0.25rem 0; transform-origin: center; }
  .subtitle { font-size: 1.25rem; margin: 0; font-weight: 600; color: #e6e6e9 }
  .tagline { margin: 0.5rem 0 1rem 0; color: #b9b9bd; }
  .description { max-width: 720px; margin: 0.5rem auto 1.25rem auto; color: #cfcfd1; }

    /* Buttons with micro-interactions */
    .actions { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }
  .btn { display:inline-block; padding:0.65rem 1rem; border-radius:8px; text-decoration:none; color:var(--accent); border:2px solid var(--accent); font-weight:600; transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease; background:transparent }
  .btn.primary { background:var(--accent); color:var(--accent-contrast); }
  .btn:hover { transform: translateY(-4px); box-shadow: 0 14px 28px rgba(73,5,154,0.18); }
  .btn:active { transform: translateY(-2px) scale(0.995); }

    /* Feature cards with subtle lift on hover and staggered entrance */
  .features { padding:2.25rem 1rem; max-width:1100px; margin:0 auto; }
  .features h2 { text-align:center; color:#e6e6e9; margin-bottom:0.25rem; }
  .features .lead { text-align:center; color:#cfcfd1; margin-bottom:1rem; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; }
    .card {
      border:1px solid var(--border); padding:1rem; border-radius:10px; background:var(--card); box-shadow:0 6px 18px rgba(0,0,0,0.28);
      transition: transform 260ms cubic-bezier(.2,.9,.2,1), box-shadow 260ms ease;
      transform-origin: center;
      animation: fadeUp 520ms ease both;
    }
    .cards .card:nth-child(1){ animation-delay: 0.05s }
    .cards .card:nth-child(2){ animation-delay: 0.12s }
    .cards .card:nth-child(3){ animation-delay: 0.18s }
    .card:hover { transform: translateY(-8px) scale(1.02); box-shadow:0 18px 36px rgba(0,0,0,0.12); }
  .card h3 { margin:0 0 0.5rem 0; color:#49059a; }
  .card p { margin:0; color:#d8d8da; }

    /* Footer */
  .site-footer { margin-top:2.5rem; padding:2rem 1rem; border-top:1px solid var(--border); }
  .footer-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:2rem; max-width:1200px; margin:0 auto; align-items:start }

  .footer-brand .brand-head{ display:flex; gap:0.8rem; align-items:center }
  .footer-brand h3{ margin:0; color:#fff }
  .footer-brand .muted{ color:#bdbfc2; margin-top:0.4rem; max-width:280px }

  .social-icons{ display:flex; gap:0.5rem; margin-top:1rem }
  .social-icons .icon{ width:36px;height:36px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:var(--card);color:var(--accent);border:1px solid rgba(73,5,154,0.12);text-decoration:none;transition:transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease }
  .social-icons .icon img{ width:18px; height:18px; display:block; filter: invert(1) brightness(1.6) saturate(0.7) }
  .social-icons .icon:hover{ transform:translateY(-4px) scale(1.03); box-shadow:0 10px 24px rgba(73,5,154,0.14); background:var(--accent); color:var(--accent-contrast) }
  .social-icons .icon:focus{ outline:2px solid rgba(73,5,154,0.18); outline-offset:3px }

  .footer-links h4, .footer-contact h4{ margin:0 0 0.5rem 0; color:#fff }
  .footer-links ul, .footer-contact ul{ list-style:none;padding:0;margin:0 }
  .footer-links li, .footer-contact li{ margin:0.6rem 0 }
  .footer-links a{ color:#cfcfd1; text-decoration:none }
  .footer-links a:hover{ color:var(--accent) }

  .footer-contact .contact-item{ display:flex;align-items:center;gap:0.6rem;color:#cfcfd1 }
  .footer-contact svg{ width:16px;height:16px;opacity:0.9 }

  .bottom-bar{ max-width:1200px;margin:1.5rem auto 0 auto;padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:1rem }
  .bottom-bar .bottom-links a{ color:var(--accent); text-decoration:none; margin-left:0.6rem }
  .bottom-bar .bottom-links a:hover{ text-decoration:underline }

  @media (max-width:900px){ .footer-grid{ grid-template-columns:1fr; } .bottom-bar{ flex-direction:column; align-items:flex-start; gap:0.6rem } }

    /* Header logo micro-interaction */
    .logo{ width:34px; height:34px; transition: transform 220ms ease; }
    .logo:hover{ transform: rotate(-8deg) scale(1.06); }

    @media (max-width:600px) {
      .title { font-size:2rem; }
      .actions { flex-direction:column; }
    }
    `
  ]
})
export class WelcomeComponent {}