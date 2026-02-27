import os

from comfy_api.latest import io


class DuffyIteratorCurrentFilename(io.ComfyNode):
    """
    Helper node for DirectoryImageIterator.

    Receives a list of filenames, strips the file extension from each one,
    and re-emits them as a list suitable for use as SaveImage filename prefixes.

    Wiring:
        DirectoryImageIterator.filename → this node → SaveImage.filename_prefix
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_IteratorCurrentFilename",
            display_name="Iterator Current Filename",
            category="Duffy/Image",
            description=(
                "Strips file extensions from a list of filenames emitted by "
                "Directory Image Iterator, producing clean filename prefixes."
            ),
            is_input_list=True,
            is_output_list=(True,),
            inputs=[
                io.String.Input(
                    "filename",
                    display_name="Filename",
                    tooltip="Filename list from Directory Image Iterator",
                ),
            ],
            outputs=[
                io.String.Output(
                    "filename_prefix",
                    display_name="Filename Prefix",
                    tooltip="Filename with extension stripped, ready for SaveImage",
                ),
            ],
        )

    @classmethod
    def execute(cls, filename: list[str]) -> io.NodeOutput:
        """Strip extensions so each string is ready for use as a filename_prefix."""
        return io.NodeOutput([os.path.splitext(f)[0] for f in filename])
