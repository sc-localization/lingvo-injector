export const fetchTranslation = async (
  version: string,
  fileName: string
): Promise<string> => {
  const serverUrl = `${import.meta.env.VITE_SERVER_URL}/translations/${version}/${fileName}`;

  try {
    const response = await fetch(serverUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download file for version ${version}: ${response.statusText}`
      );
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching translation:', error);
    throw error;
  }
};
