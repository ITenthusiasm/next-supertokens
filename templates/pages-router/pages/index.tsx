import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getGlobalServerData } from "@/lib/server/requestHelpers";
import NavLayout from "@/components/NavLayout";

export default function Home({ loader }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { user } = loader;

  return (
    <NavLayout authenticated={Boolean(user?.id)}>
      <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.4 }}>
        <h1 style={{ textAlign: "center" }}>Hello! This page is publicly accessible to anyone and everyone!</h1>
      </div>
    </NavLayout>
  );
}

interface ServerData {
  loader: { user: Required<GlobalServerData>["user"] | null };
}

export const getServerSideProps = (async ({ req }) => {
  const { user = null } = getGlobalServerData(req);
  return { props: { loader: { user } } };
}) satisfies GetServerSideProps<ServerData>;
