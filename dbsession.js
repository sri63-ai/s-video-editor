// S Studio Local IndexedDB Session Manager (Zero-Error Build)
(function () {
    const DB_NAME = "SStudioDraftsDB";
    const DB_VERSION = 1;
    const STORE_NAME = "projectDrafts";

    function openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("IndexedDB not supported"));
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "draftId" });
                }
            };
            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror = function (e) { reject(e.target.error); };
        });
    }

    window.saveDraftToDevice = async function (draftObj) {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readwrite");
                draftObj.updatedAt = Date.now();
                const req = tx.objectStore(STORE_NAME).put(draftObj);
                req.onsuccess = () => resolve(draftObj.draftId);
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            return draftObj.draftId;
        }
    };

    window.getAllSavedDrafts = async function () {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readonly");
                const req = tx.objectStore(STORE_NAME).getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    resolve(list);
                };
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            return [];
        }
    };

    window.getDraftById = async function (draftId) {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readonly");
                const req = tx.objectStore(STORE_NAME).get(draftId);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            return null;
        }
    };

    window.deleteDraftById = async function (draftId) {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readwrite");
                const req = tx.objectStore(STORE_NAME).delete(draftId);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            return false;
        }
    };
})();