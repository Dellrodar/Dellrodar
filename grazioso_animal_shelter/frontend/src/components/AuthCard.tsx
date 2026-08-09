import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import logo from "../assets/grazioso-logo.png";

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

export const AuthCard = ({ title, children }: AuthCardProps) => (
  <Card variant="outlined" sx={{ maxWidth: 400, mx: "auto", mt: { xs: 2, sm: 6 } }}>
    <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
      <Avatar
        src={logo}
        alt=""
        sx={{ width: 72, height: 72, alignSelf: "center", bgcolor: "#ffffff" }}
      />
      <Typography variant="h5" component="h1" sx={{ textAlign: "center" }}>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);
