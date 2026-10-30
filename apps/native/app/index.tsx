import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { isSetUp } from "@/src/data/adventure-client";

/** Start page: a set up app goes to Home, a new one to Welcome. */
export default function Index() {
	const [setUp, setSetUp] = useState<boolean | null>(null);

	useEffect(() => {
		isSetUp().then(setSetUp);
	}, []);

	if (setUp === null) {
		return null;
	}
	return <Redirect href={setUp ? "/home" : "/welcome"} />;
}
