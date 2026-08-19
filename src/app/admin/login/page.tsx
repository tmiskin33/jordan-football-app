import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import SubmitButton from "@/components/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/admin/login?error=CredentialsSignin`);
      }
      throw err;
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-bold text-steel-900">Coach login</h1>
        <p className="text-sm text-steel-500">Sign in to manage film, imports, and the schedule.</p>
      </div>
      <form action={login} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-steel-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="rounded-md border border-steel-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-steel-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-steel-300 px-3 py-2 text-sm"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">Incorrect email or password. Try again.</p>
        )}
        <SubmitButton
          pendingLabel="Signing in…"
          className="rounded-md bg-maroon-700 px-3 py-2 text-sm font-medium text-white hover:bg-maroon-800 disabled:cursor-wait disabled:opacity-60"
        >
          Sign in
        </SubmitButton>
      </form>
    </div>
  );
}
