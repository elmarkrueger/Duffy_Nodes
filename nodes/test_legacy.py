import folder_paths


class TestLegacyLora:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {
            "lora": (folder_paths.get_filename_list("loras"), )
        }}
    RETURN_TYPES = ()
    FUNCTION = "noop"
    CATEGORY = "Test"

    def noop(self, **kwargs):
        return ()

NODE_CLASS_MAPPINGS = {
    "TestLegacyLora": TestLegacyLora
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "TestLegacyLora": "Test Legacy Lora"
}
