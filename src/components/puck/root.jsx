import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export const PUCK_ROOT = {
    defaultProps: {
        title: "My Page",
    },
    render: ({ puck: { isEditing, renderDropZone: DropZone } }) => {
        return (
            <div
                dir="ltr"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100vh",
                }}
            >
                <Header editMode={isEditing} />
                <DropZone zone="default-zone" style={{ flexGrow: 1 }} />

                <Footer>
                    <Footer.List title="Section">
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                    </Footer.List>
                    <Footer.List title="Section">
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                    </Footer.List>
                    <Footer.List title="Section">
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                    </Footer.List>
                    <Footer.List title="Section">
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                        <Footer.Link href="#">Label</Footer.Link>
                    </Footer.List>
                </Footer>
            </div>
        );
    },
};
