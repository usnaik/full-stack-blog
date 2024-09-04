import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const useUser = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // The call back function (2nd arg) is called whenever user LogIn of LogsOut & CreatAccount
        const unsubscribe = onAuthStateChanged(getAuth(), user => {
            setUser(user);
            setIsLoading(false);
        });

        //  To avoid memory leaks, when hook is removed from DOM, when user navigates away from page
        return unsubscribe;
    }, []);

    return {user, isLoading};
}

export default useUser;