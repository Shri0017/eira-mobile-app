import CryptoJS from "crypto-js";
import {
    REACT_APP_SE_KEY,
    REACT_APP_ENCRYPT_KEY,
    REACT_APP_ENCRYPT_IV,
    REACT_APP_ENCRYPT_QUERY,
    REACT_APP_PADDING_VALUE,
} from "@env";

const iv = CryptoJS.lib.WordArray.random(16);
const salt = CryptoJS.lib.WordArray.random(64);

export const encryptData = (data: string | unknown[]) => {
    const secretKey = CryptoJS.enc.Hex.parse(REACT_APP_SE_KEY).toString();
    const stringifiedData = Array.isArray(data) ? JSON.stringify(data) : data;

    const cipher = CryptoJS.AES.encrypt(stringifiedData, secretKey, {
        iv: iv,
        salt: salt,
        mode: CryptoJS.mode.OFB,
        padding: CryptoJS.pad.Pkcs7,
    });

    const cipherText = cipher.toString();
    const Salt = salt.toString(CryptoJS.enc.Base64);
    const Iv = iv.toString(CryptoJS.enc.Base64);
    const encryptedData = `${Salt}.${Iv}.${cipherText}`;

    return encryptedData;
};

export const decryptData = (encryptedData: string) => {
    const [saltStr, ivStr, cipherText] = encryptedData.split(".");
    const secretKey = CryptoJS.enc.Hex.parse(REACT_APP_SE_KEY).toString();

    const saltDecoded = CryptoJS.enc.Base64.parse(saltStr);
    const ivDecoded = CryptoJS.enc.Base64.parse(ivStr);

    const decrypted = CryptoJS.AES.decrypt(cipherText, secretKey, {
        iv: ivDecoded,
        salt: saltDecoded,
        mode: CryptoJS.mode.OFB,
        padding: CryptoJS.pad.Pkcs7,
    });

    let decryptedData: string | object = decrypted.toString(CryptoJS.enc.Utf8);

    try {
        decryptedData = JSON.parse(decryptedData as string);
    } catch (e) {
        console.error(e);
    }

    return decryptedData;
};

export const PassEncrypt = (Password: string) => {
    const cipher = CryptoJS.AES.encrypt(
        Password,
        CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_KEY), {
            iv: CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_IV),
            mode: CryptoJS.mode.CFB,
            padding: CryptoJS.pad.NoPadding,
        }
    );
    const result = cipher.ciphertext.toString(CryptoJS.enc.Base64);
    return result;
};

export const PassDecrypt = (EncryptedPassword: string) => {
    const decipher = CryptoJS.AES.decrypt(
        EncryptedPassword,
        CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_KEY), {
            iv: CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_IV),
            mode: CryptoJS.mode.CFB,
            padding: CryptoJS.pad.NoPadding,
        }
    );
    const result = CryptoJS.enc.Utf8.stringify(decipher);
    return result;
};

export const queryEncrypt = (Password: string) => {
    const cipher = CryptoJS.AES.encrypt(
        Password,
        CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_QUERY), {
            iv: CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_IV),
            mode: CryptoJS.mode.CFB,
            padding: CryptoJS.pad.NoPadding,
        }
    );
    const result = cipher.ciphertext.toString(CryptoJS.enc.Base64);
    return result;
};

export const queryDecrypt = (EncryptedPassword: string) => {
    const decipher = CryptoJS.AES.decrypt(
        EncryptedPassword,
        CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_QUERY), {
            iv: CryptoJS.enc.Utf8.parse(REACT_APP_ENCRYPT_IV),
            mode: CryptoJS.mode.CFB,
            padding: CryptoJS.pad.NoPadding,
        }
    );
    const result = CryptoJS.enc.Utf8.stringify(decipher);
    return result;
};

export function paddedEncryptQuery(query: string) {
    const encryptLv1 = queryEncrypt(query);
    const date = new Date().getMilliseconds().toString();
    const encryptLv2 = queryEncrypt(date);
    const padding = encryptLv1 + REACT_APP_PADDING_VALUE + encryptLv2;
    const encryptLv3 = queryEncrypt(padding);

    return encryptLv3;
}

export function decryptPaddedQuery(query: string) {
    try {
        const encryptLv1 = queryDecrypt(query);
        const parts = encryptLv1.split(REACT_APP_PADDING_VALUE);
        const desiredPart = parts[0];
        const result = queryDecrypt(desiredPart);

        return result;
    } catch (error) {
        console.error("Error decrypting query:", error);
        return null;
    }
}