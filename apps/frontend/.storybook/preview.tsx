import type { Preview } from "@storybook/react";
import "../src/app/globals.css";
// Initialise i18next so stories render real copy instead of translation keys.
import "../src/i18n/config";

const preview: Preview = {
  parameters: {
    // Components use next/navigation (App Router) hooks such as useRouter.
    nextjs: { appDirectory: true },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "hsl(0 0% 100%)" },
        { name: "dark", value: "hsl(222.2 84% 4.9%)" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.backgrounds?.value === "hsl(222.2 84% 4.9%)";
      return (
        <div className={isDark ? "dark" : ""}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
