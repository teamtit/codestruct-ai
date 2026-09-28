# Ashick Modern Developer Portfolio

A modern anime-inspired developer portfolio with:

- 5 main navigation blocks: Home, About, Projects, Portfolio, Contact
- CSS 3D rotating cube + orbit rings (no heavy 3D asset required)
- Anime.js entrance/micro animations
- Locomotive Scroll smooth scrolling on desktop
- Bootstrap responsive navigation/grid
- Custom cursor and magnetic buttons
- Responsive mobile layout
- Node.js + Express contact API
- MongoDB/Mongoose contact-message storage
- No external images required: the photo area is an intentional placeholder

## Run locally

1. Install Node.js.
2. In this folder run:
   `npm install`
3. Copy `.env.example` to `.env`.
4. Put your MongoDB connection string in `MONGO_URI`.
5. Run:
   `npm start`
6. Open `http://localhost:3000`

MongoDB can be local (`mongodb://127.0.0.1:27017/ashickPortfolio`) or MongoDB Atlas.

## Personalize

- Replace `YOUR PHOTO` in the About section with your image later.
- Replace email/GitHub/LinkedIn placeholders in `index.html`.
- Replace project descriptions/links with your actual URLs.
- Colors are controlled from `public/assets/style.css` in `:root`.

## Static hosting

The frontend can be hosted on GitHub Pages, but the `/api/contact` endpoint requires the Node server to be deployed (Render/Railway/etc.) and the frontend fetch URL changed to that API URL.
