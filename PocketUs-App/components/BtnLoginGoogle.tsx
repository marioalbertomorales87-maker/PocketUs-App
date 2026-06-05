import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Button, Surface, Text } from "react-native-paper"
import {
    GoogleSignin,
    statusCodes,
} from "@react-native-google-signin/google-signin"

// Reemplaza este valor por tu Web Client ID de Google Cloud Console
// (el de tipo "Web application", no el de Android)
const WEB_CLIENT_ID = "825372275802-fb4ov3ivbkkkndlvrmsv8iono3q76bon.apps.googleusercontent.com"

GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: ["profile", "email"],
})

export default function BtnLoginGoogle() {
    const [emailLogueado, setEmailLogueado] = useState<string | null>(null)
    const [estadoLogin, setEstadoLogin] = useState("Sin autenticar")
    const [cargando, setCargando] = useState(false)

    const handleLogin = async () => {
        setCargando(true)
        setEmailLogueado(null)
        setEstadoLogin("Abriendo login de Google...")

        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
            const response = await GoogleSignin.signIn()

            // v16 can return either { data: ... } or user payload directly.
            const payload =
                typeof response === "object" && response !== null && "data" in response
                    ? (response as { data?: { user?: { email?: string; name?: string; id?: string }; idToken?: string } }).data
                    : (response as { user?: { email?: string; name?: string; id?: string }; idToken?: string })

            const user = payload?.user
            if (!user?.email) {
                setEstadoLogin("Login cancelado")
                return
            }

            setEmailLogueado(user.email)
            setEstadoLogin("Autenticado")

            console.log("Google login exitoso. Datos del usuario:", {
                email: user.email,
                name: user.name,
                id: user.id,
            })

            // Aquí puedes enviar payload.idToken al backend
            console.log("ID Token para backend:", payload?.idToken)
        } catch (error: unknown) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error
            ) {
                const googleError = error as { code: string; message?: string }
                if (googleError.code === statusCodes.SIGN_IN_CANCELLED) {
                    setEstadoLogin("Login cancelado")
                } else if (googleError.code === statusCodes.IN_PROGRESS) {
                    setEstadoLogin("Login ya en progreso")
                } else if (googleError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    setEstadoLogin("Google Play Services no disponible")
                } else {
                    setEstadoLogin(`Error: ${googleError.code}`)
                    console.error("Google Sign-In error:", googleError)
                }
            } else {
                setEstadoLogin("Error desconocido")
                console.error("Google Sign-In error inesperado:", error)
            }
        } finally {
            setCargando(false)
        }
    }

    return (
        <Surface style={styles.container} elevation={1}>
            <Button
                mode="contained"
                icon="google"
                style={styles.btn}
                contentStyle={styles.buttonContent}
                disabled={cargando}
                onPress={handleLogin}
            >
                {cargando ? "Cargando..." : "Login con Google"}
            </Button>

            <Text variant="bodyMedium" style={styles.estado}>{estadoLogin}</Text>
            <Text variant="bodyMedium" style={styles.email}>
                {emailLogueado ? `Email: ${emailLogueado}` : "Email: (sin datos)"}
            </Text>
        </Surface>
    )
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 14,
        padding: 12,
    },
    btn: {
        borderRadius: 10,
    },
    buttonContent: {
        minHeight: 46,
    },
    estado: {
        textAlign: "center",
        marginTop: 10,
    },
    email: {
        textAlign: "center",
        fontWeight: "bold",
        marginTop: 6,
    },
})