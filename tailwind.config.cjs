/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          black: "#000000",
          white: "#ffffff",
          gray: "#f5f5f7",
          ink: "#1d1d1f",
          blue: "#0071e3",
          link: "#0066cc",
          bright: "#2997ff",
          neutral: "#6e6e73",
          soft: "#d2d2d7",
          mid: "#86868b",
          utility: "#424245",
          graphite: {
            a: "#272729",
            b: "#262629",
            c: "#28282b",
            d: "#2a2a2c"
          }
        },
        background: "#f5f5f7",
        foreground: "#1d1d1f",
        border: "#d2d2d7",
        ring: "#0071e3"
      },
      fontFamily: {
        display: [
          "SF Pro Display",
          "SF Pro Icons",
          "Segoe UI Variable Display",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        text: [
          "SF Pro Text",
          "SF Pro Icons",
          "Segoe UI Variable Text",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      fontSize: {
        hero: ["clamp(2.75rem, 6vw, 5rem)", { lineHeight: "1.03", letterSpacing: "-0.045em", fontWeight: "600" }],
        section: ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.08", letterSpacing: "-0.012em", fontWeight: "600" }],
        product: ["2.5rem", { lineHeight: "1.1", fontWeight: "600" }],
        promo: ["2rem", { lineHeight: "1.12", letterSpacing: "0.008em", fontWeight: "600" }],
        card: ["1.75rem", { lineHeight: "1.14", letterSpacing: "0.007em", fontWeight: "600" }],
        utility: ["1.5rem", { lineHeight: "1.17", letterSpacing: "0.009em", fontWeight: "600" }],
        body: ["1.0625rem", { lineHeight: "1.47", letterSpacing: "-0.022em" }],
        control: ["0.875rem", { lineHeight: "1.35", letterSpacing: "-0.014em" }],
        micro: ["0.75rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }]
      },
      borderRadius: {
        field: "0.75rem",
        panel: "1.125rem",
        module: "1.75rem",
        spotlight: "2.25rem"
      },
      boxShadow: {
        hairline: "inset 0 0 0 1px rgba(210, 210, 215, 0.72)",
        soft: "0 18px 60px rgba(0, 0, 0, 0.08)",
        lift: "0 24px 90px rgba(0, 0, 0, 0.14)",
        innerHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.18)"
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.32, 0.72, 0, 1)"
      }
    }
  },
  plugins: []
};
