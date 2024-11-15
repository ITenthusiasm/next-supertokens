// Primary Imports
import type { IncomingMessage } from "node:http";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useFormAction } from "@/lib/utils/hooks";
import { getGlobalServerData, getFormData } from "@/lib/server/requestHelpers";
import { methodNotAllowed } from "@/lib/server/responseHelpers";
import NavLayout from "@/components/NavLayout";

/* -------------------- Browser -------------------- */
export default function Private({ loader, action }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { user } = loader;
  const [submissionResponse, submit] = useFormAction(action);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    submit(form);
  }

  return (
    <NavLayout authenticated>
      <div id="private-page">
        <h1>Hello! This page is private! 🤫 Your user id: {user.id}</h1>
        <h2>Try submitting some data!</h2>

        <div className="form-submission-example">
          <form method="post" onSubmit={handleSubmit}>
            <h3>Form</h3>

            <label htmlFor="text">Text Input</label>
            <input id="text" name="text" type="text" />
            <button type="submit">Submit</button>
          </form>

          <hr />

          <div>
            <h3>Response</h3>
            {submissionResponse?.success && <pre>{JSON.stringify(submissionResponse.data, null, 2)}</pre>}
          </div>
        </div>
      </div>
    </NavLayout>
  );
}

/* -------------------- Server -------------------- */
interface ServerData {
  loader: { user: Required<GlobalServerData>["user"] };
  action?: { success: boolean; data: { text: string } };
}

export const getServerSideProps = (async ({ req, res }) => {
  if (req.method === "GET") return { props: { loader: getLoaderData(req) } };

  if (req.method === "POST") {
    const data = Object.fromEntries(await getFormData(req)) as Required<ServerData>["action"]["data"];
    return { props: { loader: getLoaderData(req), action: { success: true, data } } };
  }

  return methodNotAllowed(res, "GET, POST");
}) satisfies GetServerSideProps<ServerData>;

function getLoaderData(request: IncomingMessage): ServerData["loader"] {
  const user = getGlobalServerData(request).user as Required<GlobalServerData>["user"];
  return { user };
}
