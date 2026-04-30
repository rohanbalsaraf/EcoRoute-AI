import { createCheckout, lemonsqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    lemonsqueezySetup({
      apiKey: process.env.LEMONSQUEEZY_API_KEY!,
      onError: (error) => console.error("Lemon Squeezy Error:", error),
    });

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

    if (!storeId || !variantId || storeId === "your_store_id_here" || variantId === "your_variant_id_here") {
      return NextResponse.json(
        { error: "Lemon Squeezy Store ID or Variant ID is not configured." },
        { status: 500 }
      );
    }

    const checkout = await createCheckout(storeId, variantId, {
      checkoutData: {
        custom: {
          user_id: userId,
        },
      },
    });

    if (checkout.error) {
      console.error(checkout.error);
      return NextResponse.json({ error: checkout.error.message }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.data?.data.attributes.url });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
