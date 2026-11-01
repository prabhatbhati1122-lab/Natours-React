import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAlert } from "../context/AlertContext";

export default function BookingSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [error, setError] = useState("");
  const started = useRef(false); // StrictMode mein effect do baar chalta hai, ye ek hi baar chalne deta hai

  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!sessionId || started.current) return;
    started.current = true;

    async function confirm() {
      try {
        const res = await fetch("/api/v1/bookings/confirm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.message || "Could not confirm booking");

        showAlert("success", "Your booking was successful!");
        navigate("/my-tours", { replace: true });
      } catch (err) {
        setError(err.message);
      }
    }

    confirm();
  }, [sessionId, navigate, showAlert]);

  return (
    <main className="main">
      <p>
        {!sessionId
          ? "Missing payment session"
          : error || "Confirming your payment..."}
      </p>
    </main>
  );
}
