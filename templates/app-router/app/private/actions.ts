"use server";

type ActionData = undefined | { success: boolean; data: { text: string } };
export async function reflectData(_previousState: ActionData, formData: FormData): Promise<ActionData> {
  const text = formData.get("text") as string;
  return { success: true, data: { text } };
}
