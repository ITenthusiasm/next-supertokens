"use client";

// Primary Imports
import { useActionState } from "react";
import { reflectData } from "./actions";

// Styles
import "./private.scss";

interface ClientPrivateProps {
  user: Required<GlobalServerData>["user"];
}

export default function ClientPrivate({ user }: ClientPrivateProps) {
  const [response, formAction] = useActionState(reflectData, undefined);

  // TODO: Prevent form field resets when submitting with Server Actions
  // See: https://www.robinwieruch.de/react-server-action-reset-form/
  return (
    <div id="private-page">
      <h1>Hello! This page is private! 🤫 Your user id: {user.id}</h1>
      <h2>Try submitting some data!</h2>

      <div className="form-submission-example">
        <form action={formAction}>
          <h3>Form</h3>

          <label htmlFor="text">Text Input</label>
          <input id="text" name="text" type="text" />
          <button type="submit">Submit</button>
        </form>

        <hr />

        <div>
          <h3>Response</h3>
          {response?.success && <pre>{JSON.stringify(response.data, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
