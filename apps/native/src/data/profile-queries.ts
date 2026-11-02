// The child profile and the grown-up photo as React Query hooks over the app server's tRPC
// router. Writes update the cache at once (see optimistic.ts), roll back on error, and read the
// server's answer again when they settle. Screens never track "saving" or copies of the data.
import type { Called } from "@little-adventures/native-ui/called-chips";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { optimisticSet, rollback, type Snapshot } from "./optimistic";
import {
	applyChildSave,
	type ChildRow,
	clearChildPhoto,
	toChild,
	toGrownUpPhoto,
} from "./profile-map";
import { trpc, type trpcClient } from "./trpc";
import type { Profile } from "./types";

type ChildRows = Awaited<ReturnType<typeof trpcClient.child.mine.query>>;
type GrownUp = Awaited<ReturnType<typeof trpcClient.grownUp.mine.query>>;

// While the art is drawn, the child is read again this often.
const POLL_MS = 1500;

const childOptions = () =>
	trpc.child.mine.queryOptions(undefined, {
		refetchInterval: (query) =>
			query.state.data?.some((row: ChildRow) => row.artStatus === "working")
				? POLL_MS
				: false,
	});
// A new grown-up photo is cut out and drawn in the background: read it again until the face and
// the drawn cut-out are in, for a minute at most (a photo with no person found never gets them).
const FACE_WAIT_MS = 60_000;
export const grownUpOptions = () =>
	trpc.grownUp.mine.queryOptions(undefined, {
		refetchInterval: (query) => {
			const row = query.state.data;
			const fresh =
				row && Date.now() - new Date(row.updatedAt).getTime() < FACE_WAIT_MS;
			return row && !(row.faceUrl && row.cutUrl) && fresh ? POLL_MS : false;
		},
	});

/** The child as the screens know it. Undefined data while loading. */
export const useChild = () => useQuery({ ...childOptions(), select: toChild });

/** The grown-up's own photo: undefined while loading, null when none is saved. */
export const useGrownUpPhoto = () =>
	useQuery({ ...grownUpOptions(), select: toGrownUpPhoto });

const childKey = () => trpc.child.mine.queryKey();
const grownUpKey = () => trpc.grownUp.mine.queryKey();

/**
 * Saves some fields of the profile on top of what is cached and answers the merged profile.
 * Until name and age are both set nothing is sent (the form saves them together).
 */
export function useSaveProfile() {
	const client = useQueryClient();
	const save = useMutation(
		trpc.child.save.mutationOptions<Snapshot<ChildRows>>({
			onError: (_error, _input, snapshot) =>
				rollback(client, childKey(), snapshot),
			onMutate: (input) =>
				optimisticSet<ChildRows>(client, childKey(), (rows) =>
					applyChildSave(rows, input)
				),
			onSettled: () => client.invalidateQueries(trpc.child.mine.queryFilter()),
		})
	);
	return async (patch: Partial<Profile>): Promise<Profile> => {
		const { id, profile } = toChild(
			await client.ensureQueryData(childOptions())
		);
		const merged = { ...profile, ...patch };
		if (merged.childName.trim() === "" || merged.childAge === null) {
			return merged;
		}
		await save.mutateAsync({
			age: merged.childAge,
			grownUp: merged.grownUp,
			id,
			kind: merged.childKind,
			look: merged.look,
			name: merged.childName,
			photoKey: merged.photoKey,
			puppy: merged.puppy,
		});
		return merged;
	};
}

/** Deletes the stored photo of the child; the cache drops the photo, face and looks at once. */
export function useDeleteChildPhoto() {
	const client = useQueryClient();
	const remove = useMutation(
		trpc.photo.delete.mutationOptions<Snapshot<ChildRows>>({
			onError: (_error, _input, snapshot) =>
				rollback(client, childKey(), snapshot),
			onMutate: ({ childId }) =>
				optimisticSet<ChildRows>(client, childKey(), (rows) =>
					clearChildPhoto(rows, childId)
				),
			onSettled: () => client.invalidateQueries(trpc.child.mine.queryFilter()),
		})
	);
	return async () => {
		const { id } = toChild(await client.ensureQueryData(childOptions()));
		if (id) {
			await remove.mutateAsync({ childId: id });
		}
	};
}

/** Saves the grown-up's photo by its storage key; the server's row (with urls) replaces the cache. */
export function useSaveGrownUpPhoto() {
	const client = useQueryClient();
	const save = useMutation(
		trpc.grownUp.save.mutationOptions({
			onSettled: () =>
				client.invalidateQueries(trpc.grownUp.mine.queryFilter()),
		})
	);
	return (photoKey: string) => save.mutateAsync({ photoKey });
}

/** Deletes the grown-up's photo; the cache says none at once. */
export function useDeleteGrownUpPhoto() {
	const client = useQueryClient();
	const remove = useMutation(
		trpc.grownUp.delete.mutationOptions<Snapshot<GrownUp>>({
			onError: (_error, _input, snapshot) =>
				rollback(client, grownUpKey(), snapshot),
			onMutate: () => optimisticSet<GrownUp>(client, grownUpKey(), () => null),
			onSettled: () =>
				client.invalidateQueries(trpc.grownUp.mine.queryFilter()),
		})
	);
	return () => remove.mutateAsync();
}

/** Saves what the child calls the grown-up; the cache shows it at once. */
export function useSetCalled() {
	const client = useQueryClient();
	const set = useMutation(
		trpc.grownUp.setCalled.mutationOptions<Snapshot<GrownUp>>({
			onError: (_error, _input, snapshot) =>
				rollback(client, grownUpKey(), snapshot),
			onMutate: (input) =>
				optimisticSet<GrownUp>(client, grownUpKey(), (row) => ({
					...row,
					calledName: input.name,
					calledPronoun: input.pronoun,
					calledRelation: input.relation,
				})),
			onSettled: () =>
				client.invalidateQueries(trpc.grownUp.mine.queryFilter()),
		})
	);
	return (called: Called) => set.mutateAsync(called);
}
