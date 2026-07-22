import { createFileRoute } from "@tanstack/react-router";
import { uploadImageToImgBB } from "@/lib/sghub.server";

export const Route = createFileRoute("/api/upload-logo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { image } = (await request.json()) as { image: string };
        const result = await uploadImageToImgBB(image);
        return Response.json({ url: result.url });
      },
    },
  },
});
