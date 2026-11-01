// Account button and dialog. Talks only to the auth interface (auth.js), so the backend can change without touching this file.
import * as I from "./i18n.js";
import { AuthError } from "./auth.js";

const $ = (s) => document.querySelector(s);

export function initAccount({ auth, cloud = null, cloudPanel = null }) {
  let mode = "in"; // "in" = sign in, "up" = sign up
  const dlg = $("#acct");
  const msg = $("#acct-msg");

  // With cloud sync configured, the cloud panel replaces the device-only account form.
  if (cloudPanel) {
    $("#acct-form").hidden = true; $("#acct-out").hidden = true; $("#acct-note").hidden = true; $("#acct-title").hidden = true;
    $("#acct").insertBefore(cloudPanel.el, $("#acct-close").parentElement);
    $("#btn-account").onclick = () => { cloudPanel.render(); dlg.showModal(); };
    $("#acct-close").onclick = () => dlg.close();
    const paintCloud = () => { $("#btn-account").textContent = cloud.user()?.email ?? I.t("acctBtn"); };
    cloud.onChange(paintCloud);
    return { paint: paintCloud };
  }

  function paint() {
    const u = auth.user;
    $("#btn-account").textContent = u ? u.email : I.t("acctBtn");
    $("#acct-title").textContent = I.t(u ? "acctSignedIn" : "acctTitle", { email: u?.email ?? "" });
    $("#acct-form").hidden = !!u;
    $("#acct-out").hidden = !u;
    $("#acct-signout").textContent = I.t("acctSignOut");
    $("#acct-note").textContent = I.t("acctNote");
    $("#acct-submit").textContent = I.t(mode === "up" ? "acctSignUp" : "acctSignIn");
    $("#acct-switch").textContent = I.t(mode === "up" ? "acctSwitchIn" : "acctSwitchUp");
    $("#acct-pass").autocomplete = mode === "up" ? "new-password" : "current-password";
  }

  const errors = { email: "acctErrEmail", short: "acctErrShort", exists: "acctErrExists", bad: "acctErrBad" };

  $("#btn-account").onclick = () => { msg.textContent = ""; paint(); dlg.showModal(); };
  $("#acct-switch").onclick = () => { mode = mode === "up" ? "in" : "up"; msg.textContent = ""; paint(); };
  $("#acct-form").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#acct-email").value, password = $("#acct-pass").value;
    try {
      if (mode === "up") await auth.signUp(email, password);
      else await auth.signIn(email, password);
      $("#acct-pass").value = "";
      msg.textContent = "";
      paint();
      dlg.close();
    } catch (err) {
      msg.textContent = I.t(errors[err instanceof AuthError ? err.code : ""] ?? "acctErrBad");
    }
  };
  $("#acct-signout").onclick = async () => { await auth.signOut(); msg.textContent = ""; paint(); };
  $("#acct-close").onclick = () => dlg.close();

  auth.onChange(paint);
  return { paint };
}
