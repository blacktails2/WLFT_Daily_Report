const TRELLO_API = "https://api.trello.com/1";

interface TrelloBoard {
  id: string;
  name: string;
}

interface TrelloCard {
  id: string;
  name: string;
  closed: boolean;
}

export async function getTrelloBoards(
  apiKey: string,
  token: string
): Promise<TrelloBoard[]> {
  const res = await fetch(
    `${TRELLO_API}/members/me/boards?key=${apiKey}&token=${token}&fields=name`
  );
  if (!res.ok) throw new Error("Failed to fetch Trello boards");
  return res.json();
}

export async function getTrelloCards(
  apiKey: string,
  token: string,
  boardId: string
): Promise<TrelloCard[]> {
  const res = await fetch(
    `${TRELLO_API}/boards/${boardId}/cards?key=${apiKey}&token=${token}&fields=name,closed&filter=all`
  );
  if (!res.ok) throw new Error("Failed to fetch Trello cards");
  return res.json();
}
