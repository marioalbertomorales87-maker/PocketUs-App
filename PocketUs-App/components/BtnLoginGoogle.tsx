import { useState } from "react"
import { StyleSheet } from "react-native"
import { Button, Surface, Text } from "react-native-paper"
import Svg, { Path } from "react-native-svg"
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
                }
            } else {
                setEstadoLogin("Error desconocido")
            }
        } finally {
            setCargando(false)
        }
    }

    return (
        <Surface style={styles.container} elevation={1}>
            <Button
                mode="contained"
                icon={() => (
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M23.766 12.276c0-.815-.067-1.636-.211-2.44H12.24v4.621h6.482a5.54 5.54 0 0 1-2.4 3.637v3h3.87c2.273-2.092 3.573-5.178 3.573-8.818Z"
                            fill="#4285F4"
                        />
                        <Path
                            d="M12.24 24c3.236 0 5.965-1.062 7.954-2.906l-3.87-3c-1.076.732-2.45 1.147-4.084 1.147-3.133 0-5.792-2.114-6.742-4.96H1.505v3.09A12.008 12.008 0 0 0 12.24 24Z"
                            fill="#34A853"
                        />
                        <Path
                            d="M5.498 14.281A7.206 7.206 0 0 1 5.125 12c0-.798.138-1.573.373-2.281V6.628H1.505A12.01 12.01 0 0 0 0 12c0 1.933.463 3.76 1.505 5.372l3.993-3.09Z"
                            fill="#FBBC05"
                        />
                        <Path
                            d="M12.24 4.759c1.72 0 3.255.59 4.474 1.746l3.33-3.33C18.2 1.46 15.477 0 12.24 0A12.008 12.008 0 0 0 1.505 6.628l3.993 3.09c.95-2.846 3.61-4.959 6.742-4.959Z"
                            fill="#EA4335"
                        />
                    </Svg>
                )}
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