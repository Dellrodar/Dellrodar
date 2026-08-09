import { useEffect } from "react";

const APP_NAME = "Grazioso Salvare Animal Shelter";

export const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
};
