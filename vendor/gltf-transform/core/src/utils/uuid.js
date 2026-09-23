const ALPHABET = '23456789abdegjkmnpqrvwxyzABDEGJKMNPQRVWXYZ';
const UNIQUE_RETRIES = 999;
const ID_LENGTH = 6;
const previousIDs = new Set();
const generateOne = function() {
    let rtn = '';
    for(let i = 0; i < ID_LENGTH; i++){
        rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return rtn;
};
export const uuid = function() {
    for(let retries = 0; retries < UNIQUE_RETRIES; retries++){
        const id = generateOne();
        if (!previousIDs.has(id)) {
            previousIDs.add(id);
            return id;
        }
    }
    return '';
};
